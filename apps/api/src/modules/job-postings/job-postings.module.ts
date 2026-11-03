import { Module } from '@nestjs/common';

import { JobPostingsController } from './job-postings.controller';
import { JobPostingsService } from './job-postings.service';
import { JobPostingsSearchService } from './search/job-postings-search.service';

@Module({
  controllers: [JobPostingsController],
  providers: [
    JobPostingsService,
    JobPostingsSearchService,
  ],
  exports: [
    JobPostingsService,
    JobPostingsSearchService,
  ],
})
export class JobPostingsModule {}