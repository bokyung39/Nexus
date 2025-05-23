import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { FileService } from '../file/file.service';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { ThrottlerBehindProxyGuard } from '../rate-limiting/rate-limiting.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UserPayload } from 'src/types/user-payload';
import { Category } from 'src/types/enum/file-category.enum';
import { ProjectUserService } from '../project-user/project-user.service';
import { CommunityService } from '../community/community.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community-dto';

@UseInterceptors(ClassSerializerInterceptor)
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    private readonly fileService: FileService,
    private readonly projectUserService: ProjectUserService,
    private readonly communityService: CommunityService,
  ) {}

  // POST /api/feed/create-feed/:projectId
  @Post('create-feed/:projectId')
  @UseGuards(JwtAuthGuard, ThrottlerBehindProxyGuard)
  @UseInterceptors(FilesInterceptor('community_files'))
  async createFeed(
    @Body() createCommunityDto: CreateCommunityDto,
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    const projectUser = await this.projectUserService.getProjectUser(
      projectId,
      userId,
    );
    const communityId =
      await this.communityService.getCommunityByProjectId(projectId);

    const communityFiles =
      files && files.length > 0
        ? await this.fileService.handleFileUpload({
            files,
            userId,
            projectId,
            category: Category.COMMUNITY,
          })
        : null;

    const isNotice = false;

    return await this.feedService.createCommunity(
      createCommunityDto,
      projectUser,
      communityId,
      communityFiles,
      isNotice,
    );
  }

  // PATCH /api/feed/update-feed/:feedId/:projectId
  @Patch('update-feed/:feedId/:projectId')
  @UseGuards(JwtAuthGuard, ThrottlerBehindProxyGuard)
  @UseInterceptors(FilesInterceptor('community_files'))
  async updateFeed(
    @Param('feedId') feedId: number,
    @Param('projectId') projectId: number,
    @Body() updateCommunityDto: UpdateCommunityDto,
    @Req() req: UserPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;

    const projectUserId =
      await this.projectUserService.validateProjectMemberByUserId(
        projectId,
        userId,
      );

    await this.feedService.validateCommunityOwner(feedId, projectUserId);

    let communityFiles = [];
    let uploadedFiles = [];
    if (files && files.length > 0) {
      uploadedFiles = await this.fileService.handleFileUpload({
        files,
        userId,
        projectId,
        category: Category.COMMUNITY,
      });
    }
    const existingFiles = await this.feedService.getCommunityFiles(feedId);
    if (
      updateCommunityDto.deleted_files &&
      updateCommunityDto.deleted_files.length > 0
    ) {
      await this.fileService.deleteFiles(updateCommunityDto.deleted_files);
      communityFiles = existingFiles.filter(
        (file) => !updateCommunityDto.deleted_files.includes(file),
      );
    } else {
      communityFiles = existingFiles;
    }
    const finalFiles = [...communityFiles, ...uploadedFiles];

    return await this.feedService.updateCommunity(
      updateCommunityDto,
      feedId,
      finalFiles,
    );
  }

  // DELETE /api/feed/delete-feed/:feedId/:projectId
  @Delete('delete-feed/:feedId/:projectId')
  @UseGuards(JwtAuthGuard, ThrottlerBehindProxyGuard)
  async deleteFeed(
    @Param('feedId') feedId: number,
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
  ): Promise<{ message: string }> {
    const userId = req.user.id;
    const projectUserId =
      await this.projectUserService.validateProjectMemberByUserId(
        projectId,
        userId,
      );
    await this.feedService.deleteFeed(feedId, projectUserId);
    return {
      message: `Feed with ID ${feedId} has been successfully deleted.👋`,
    };
  }

  // POST /api/feed/create-notice/:projectId
  @Post('create-notice/:projectId')
  @UseGuards(JwtAuthGuard, ThrottlerBehindProxyGuard)
  @UseInterceptors(FilesInterceptor('community_files'))
  async createNotice(
    @Body() createCommunityDto: CreateCommunityDto,
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    await this.projectUserService.checkAdminPermissions(projectId, userId);
    const projectUser = await this.projectUserService.getProjectUser(
      projectId,
      userId,
    );
    const communityId =
      await this.communityService.getCommunityByProjectId(projectId);

    let community_file = null;
    if (files && files.length > 0) {
      community_file = await this.fileService.handleFileUpload({
        files,
        userId: req.user.id,
        projectId,
        category: Category.COMMUNITY,
      });
    }
    const isNotice = true;

    return await this.feedService.createCommunity(
      createCommunityDto,
      projectUser,
      communityId,
      community_file,
      isNotice,
    );
  }

  // GET /api/feed/myfeeds/:projectId
  @Get('/myfeeds/:projectId')
  @UseGuards(JwtAuthGuard)
  async getMyFeeds(
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
  ) {
    const projectUserId =
      await this.projectUserService.validateProjectMemberByUserId(
        projectId,
        req.user.id,
      );
    const { feeds } = await this.communityService.getFeedsOrNoticesByProjectId(
      projectId,
      projectUserId,
    );
    const myFeeds = feeds.filter(
      (feed) => feed.author.projectUserId === projectUserId,
    );
    return myFeeds;
  }

  // GET /api/feed/mynotices/:projectId
  @Get('mynotices/:projectId')
  @UseGuards(JwtAuthGuard)
  async getNoticesByProjectId(
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
  ) {
    const projectUserId =
      await this.projectUserService.validateProjectMemberByUserId(
        projectId,
        req.user.id,
      );
    const { notices } =
      await this.communityService.getFeedsOrNoticesByProjectId(
        projectId,
        projectUserId,
      );
    const myNotices = notices.filter(
      (notice) => notice.author.projectUserId === projectUserId,
    );
    return myNotices;
  }

  // GET /api/feed/:feedId/:projectId
  @Get(':feedId/:projectId')
  @UseGuards(JwtAuthGuard)
  async getFeedById(
    @Param('feedId') feedId: number,
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
  ) {
    const userId = req.user.id;
    await this.projectUserService.validateProjectMemberByUserId(
      projectId,
      userId,
    );
    return await this.feedService.getFeedById(feedId);
  }

  // GET /api/feed/:noticeId/:projectId
  @Get(':noticeId/:projectId')
  @UseGuards(JwtAuthGuard)
  async getNoticeById(
    @Param('noticeId') noticeId: number,
    @Param('projectId') projectId: number,
    @Req() req: UserPayload,
  ) {
    const userId = req.user.id;
    await this.projectUserService.validateProjectMemberByUserId(
      projectId,
      userId,
    );
    return await this.feedService.getNoticeById(noticeId);
  }
}
